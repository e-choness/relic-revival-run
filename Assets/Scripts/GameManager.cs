using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class GameManager : MonoBehaviour
{
    [SerializeField] List<GameObject> spawnObject;
    [SerializeField] List<GameObject> spawnPoints;
    [SerializeField] float timer;
    [SerializeField] float timeBetweenSpawns;


    // Start is called before the first frame update
    void Start()
    {
        
    }

    // Update is called once per frame
    private void Update()
    {
        CountTimer();
    }

    private void CountTimer()
    {
        // speedMultiplier += Time.deltaTime * 0.1f;
        timer += Time.deltaTime;

        if (timer > timeBetweenSpawns)
        {
            timer = 0;
            var randPointsIndex = Random.Range(0, 3);
            var randObjectIndex = Random.Range(0, 3);
            var spawn = Instantiate(spawnObject[randObjectIndex], spawnPoints[randPointsIndex].transform.position, Quaternion.identity);
            var spawnComponent = spawn.GetComponent<spawnObjectScript>();
            spawnComponent.spawnType = randObjectIndex;
        }
    }
}
