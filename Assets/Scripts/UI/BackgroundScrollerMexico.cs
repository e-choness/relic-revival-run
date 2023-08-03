using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.SceneManagement;

public class BackgroundScrollerMexico : MonoBehaviour
{
    private List<Vector2> waypoints;
    [SerializeField] private float movingSpeed;
    private int index;

    // Start is called before the first frame update
    void Start()
    {
        waypoints = new List<Vector2>
        {
            new Vector2(9.0f, -19.2f),
            new Vector2(-21.5f, -19.2f),
            new Vector2(-24.7f, -8.5f),
            new Vector2(11.3f, -8.1f),
            new Vector2(15.2f, 6.2f),
            new Vector2(-26.0f, 6.2f)
        };
        index = 0;
        transform.position = waypoints[index];
        index++;
    }

    // Update is called once per frame
    void Update()
    {
        MoveBackground();
    }

    private void MoveBackground()
    {
        if (Vector2.Distance(waypoints[index], transform.position) < 0.1f)
        {
            index++;
            if (index >= waypoints.Count)
            {
                GoToNextLevel();
            }
        }
        transform.position = Vector2.MoveTowards(transform.position,
            waypoints[index],
            movingSpeed * Time.deltaTime);
    }

    private void GoToNextLevel()
    {
        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex + 1);
    }
}
